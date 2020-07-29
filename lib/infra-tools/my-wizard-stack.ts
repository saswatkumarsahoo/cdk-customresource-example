import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import { Params } from './params'
import { CfnParameter } from '@aws-cdk/core';



export class MyWizardStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props)
        const amiMap = {
            "rhel7.6":
                { 'eu-west-1': "ami-0202869bdd0fc8c75" }
        }

        // VPC 
        const vpc = ec2.Vpc.fromVpcAttributes(this, 'vpc', {
            vpcId: Params.vpcId,
            availabilityZones: ['eu-west-1a'],
            publicSubnetIds: [Params.pubSubnetA, Params.pubSubnetB]
        })
        // List of public subnets
        const pubSubnetA = ec2.Subnet.fromSubnetAttributes(this, 'pubSubnetA', {
            subnetId: Params.pubSubnetA,
            availabilityZone: "eu-west-1a"
        })
        const pubSubnetB = ec2.Subnet.fromSubnetAttributes(this, 'pubSubnetB', {
            subnetId: Params.pubSubnetB,
            availabilityZone: "eu-west-1b"
        })

        // List of private subnets
        const pvtSubnetA = ec2.Subnet.fromSubnetAttributes(this, 'pvtSubnetA', {
            subnetId: Params.pvtSubnetA,
            availabilityZone: "eu-west-1a"
        })

        const pvtSubnetB = ec2.Subnet.fromSubnetAttributes(this, 'pvtSubnetB', {
            subnetId: Params.pvtSubnetB,
            availabilityZone: "eu-west-1b"
        })

        const ec2InstanceRole = new iam.Role(this, 'ec2InstanceRole', {
            roleName : "InfraToolsEC2SSMRole", // define the role name 
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')]

        });

        const iamRoleForEC2 = new iam.CfnInstanceProfile(this, 'iamRoleForEC2', {
            roles: [ec2InstanceRole.roleName],
            instanceProfileName: "MyWizardEC2SSMRole",
            path: "/"
        })

        const commonSvcSgId = cdk.Fn.importValue('CommonServicecSGId')

        const splunkIndexerSG = new ec2.SecurityGroup(this, "SG-INFRA-TOOLS-MyWizardIndexer", {
            vpc: vpc,
            allowAllOutbound: true,
            securityGroupName: "SG-INFRA-TOOLS-MyWizardIndexer",
            description: "SG for my wizard indexer"
        });

        const splunkDeploymentSG = new ec2.SecurityGroup(this, "SG-INFRA-TOOLS-MyWizardDeployment", {
            vpc: vpc,
            allowAllOutbound: true,
            securityGroupName: "SG-INFRA-TOOLS-MyWizardDeployment",
            description: "SG for my wizard deployment server"
        });

        const splunkDevSG = new ec2.SecurityGroup(this, "SG-INFRA-TOOLS-MyWizardDevelopment", {
            vpc: vpc,
            allowAllOutbound: true,
            securityGroupName: "SG-INFRA-TOOLS-MyWizardDevelopment",
            description: "SG for my wizard deployment server"
        });

        cdk.Tag.add(splunkIndexerSG, 'Name', "SG-INFRA-TOOLS-MyWizardIndexer");
        cdk.Tag.add(splunkDeploymentSG, 'Name', "SG-INFRA-TOOLS-MyWizardDeployment");
        cdk.Tag.add(splunkDevSG, 'Name', "SG-INFRA-TOOLS-MyWizardDevelopment");
        
        //Jumphost SG as Parameter
        const BastionHostSGId = new cdk.CfnParameter(this, "BastionHostSGId")
        
        const BastionHostSG = ec2.SecurityGroup.fromSecurityGroupId(this, "BastionHostSG", BastionHostSGId.valueAsString)
        splunkIndexerSG.addIngressRule(BastionHostSG, ec2.Port.tcp(443), "HTTPS from bastion hosts");
        splunkIndexerSG.addIngressRule(BastionHostSG, ec2.Port.tcp(8443), "HTTPS from bastion hosts");
        splunkIndexerSG.addIngressRule(splunkDeploymentSG, ec2.Port.tcp(9997), "TCP_9997 from my wizard deployment server");
        
        splunkDevSG.addIngressRule(splunkDeploymentSG, ec2.Port.tcp(9997), "TCP_9997 from my wizard deployment server");

        /*
        TODO: find out all the application subnet
        */
        //splunkIndexerSG.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.tcp(9997), "TCP_9997 from all subnet");
        //splunkDeploymentSG.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.tcp(8089), "TCP_8089 from all subnet");
        //splunkDevSG.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.tcp(8089), "TCP_8089 from all subnet");
        //splunkDevSG.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.tcp(9997), "TCP_9997 from all subnet");

        const splunkIndexer = new ec2.CfnInstance(this, 'splunkIndexer', {
            availabilityZone: "eu-west-1a",
            subnetId: Params.pvtSubnetA,
            instanceType: "c5.9xlarge",
            privateIpAddress: "10.230.12.132",
            keyName: Params.sshKeyName,
            imageId: amiMap["rhel7.6"]["eu-west-1"],
            securityGroupIds: [commonSvcSgId, splunkIndexerSG.securityGroupId],
            iamInstanceProfile: iamRoleForEC2.ref,
            disableApiTermination: true,
            monitoring: true,
            blockDeviceMappings: [
                {
                    deviceName: '/dev/sda1',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 70,
                        volumeType: "gp2"
                    }
                },
                {
                    deviceName: '/dev/sdb',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 100,
                        volumeType: "gp2"
                    }
                },
                {
                    deviceName: '/dev/sdc',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 96,
                        volumeType: "gp2"
                    }
                },
                {
                    deviceName: '/dev/sdd',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 15,
                        volumeType: "gp2"
                    }
                },
                {
                    deviceName: '/dev/sde',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 265,
                        volumeType: "gp2"
                    }
                }
            ],
            userData: cdk.Fn.base64
                (`#!/bin/bash\nyum -y update\nyum install -y https://s3.eu-west-1.amazonaws.com/amazon-ssm-eu-west-1/latest/linux_amd64/amazon-ssm-agent.rpm\nsystemctl status amazon-ssm-agent`)
        });



        const splunkDeploymentServer = new ec2.CfnInstance(this, 'splunkDeploymentServer', {
            availabilityZone: "eu-west-1a",
            subnetId: Params.pvtSubnetA,
            instanceType: "c5.4xlarge",
            privateIpAddress: "10.230.12.133",
            keyName: Params.sshKeyName,
            imageId: amiMap["rhel7.6"]["eu-west-1"],
            securityGroupIds: [commonSvcSgId, splunkDeploymentSG.securityGroupId],
            iamInstanceProfile: iamRoleForEC2.ref,
            disableApiTermination: true,
            monitoring: true,
            blockDeviceMappings: [
                {
                    deviceName: '/dev/sda1',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 70,
                        volumeType: "gp2"
                    }
                },
                {
                    deviceName: '/dev/sdb',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 100,
                        volumeType: "gp2"
                    }
                },
                {
                    deviceName: '/dev/sdc',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 96,
                        volumeType: "gp2"
                    }
                },
                {
                    deviceName: '/dev/sdd',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 15,
                        volumeType: "gp2"
                    }
                },
                {
                    deviceName: '/dev/sde',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 100,
                        volumeType: "gp2"
                    }
                }
            ],
            userData: cdk.Fn.base64
                (`#!/bin/bash\nyum -y update\nyum install -y https://s3.eu-west-1.amazonaws.com/amazon-ssm-eu-west-1/latest/linux_amd64/amazon-ssm-agent.rpm\nsystemctl status amazon-ssm-agent`)
        });

        const splunkDevServer = new ec2.CfnInstance(this, 'splunkDevServer', {
            availabilityZone: "eu-west-1b",
            subnetId: Params.pvtSubnetB,
            instanceType: "c5.2xlarge",
            privateIpAddress: "10.230.13.132",
            keyName: Params.sshKeyName,
            imageId: amiMap["rhel7.6"]["eu-west-1"],
            securityGroupIds: [commonSvcSgId, splunkDevSG.securityGroupId],
            iamInstanceProfile: iamRoleForEC2.ref,
            disableApiTermination: true,
            monitoring: true,
            blockDeviceMappings: [
                {
                    deviceName: '/dev/sda1',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 70,
                        volumeType: "gp2"
                    }
                },
                {
                    deviceName: '/dev/sdb',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 100,
                        volumeType: "gp2"
                    }
                },
                {
                    deviceName: '/dev/sdc',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 96,
                        volumeType: "gp2"
                    }
                },
                {
                    deviceName: '/dev/sdd',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 15,
                        volumeType: "gp2"
                    }
                },
                {
                    deviceName: '/dev/sde',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 200,
                        volumeType: "gp2"
                    }
                }
            ],
            userData: cdk.Fn.base64
                (`#!/bin/bash\nyum -y update\nyum install -y https://s3.eu-west-1.amazonaws.com/amazon-ssm-eu-west-1/latest/linux_amd64/amazon-ssm-agent.rpm\nsystemctl status amazon-ssm-agent`)
        });

        // Do not delete the instance in case of stack is deleted
        //splunkIndexer.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN)
        //splunkDeploymentServer.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN)
        //splunkDevServer.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN)


        //Tags for instances
        cdk.Tag.add(splunkIndexer, "Name", "AWILMMWI01A")
        cdk.Tag.add(splunkIndexer, "application", "splunk-indexer") 

        cdk.Tag.add(splunkDeploymentServer, "Name", "AWILMMWL01A") 
        cdk.Tag.add(splunkDeploymentServer, "application", "splunk-deployment-server") 

        cdk.Tag.add(splunkDevServer, "Name", "AWILMMWD01B") 
        cdk.Tag.add(splunkDevServer, "application", "splunk-dev-server") 


        const MyWizardTags = [
            { "customer": "J2C-ACN" },
            { "product": "mywizard" },
            { "stage": "prod" },
            { "billing_customer_code": "ZF010" },
            { "billing_wbs_code": "FP.08001.152" }
        ]
        MyWizardTags.forEach(tag => {
            let value = Object.values(tag).toString()
            cdk.Tag.add(splunkIndexer, Object.keys(tag)[0], value);
            cdk.Tag.add(splunkDevServer, Object.keys(tag)[0], value);
            cdk.Tag.add(splunkDeploymentServer, Object.keys(tag)[0], value)
        })

    }
}