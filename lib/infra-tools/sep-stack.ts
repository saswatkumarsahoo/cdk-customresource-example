import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import { Params } from './params'
import { CfnParameter } from '@aws-cdk/core';
import * as rds from '@aws-cdk/aws-rds';



export class SEPStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        const dbUserName = new CfnParameter(this, "dbUserName",
            { description: "database root username", default: "SEPADMGR" })

        const dbPassword = new CfnParameter(this, "dbPassword", {
            minLength: 8,
            noEcho: true,
            description: "password of root user"
        })

        const amiMap = {
            "win2016":
                { 'eu-west-1': "ami-044b14bf9ccadeee9" }
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
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')]

        });

        const iamRoleForEC2 = new iam.CfnInstanceProfile(this, 'iamRoleForEC2', {
            roles: [ec2InstanceRole.roleName],
            instanceProfileName: "SEPEC2SSMRole",
            path: "/"
        })

        const commonSvcSgId = cdk.Fn.importValue('CommonServicecSGId');

        const sepEC2InstanceSG = new ec2.SecurityGroup(this, "SG-INFRA-TOOLS-SEP", {
            vpc: vpc,
            allowAllOutbound: false,
            securityGroupName: "SG-INFRA-TOOLS-SEP",
            description: "SG for SEP EC2 instance"
        });

        cdk.Tag.add(sepEC2InstanceSG, "Name", "SG-INFRA-TOOLS-SEP")

        const sepEc2Instance = new ec2.CfnInstance(this, 'sepEc2Instance', {
            availabilityZone: "eu-west-1a",
            subnetId: Params.pvtSubnetA,
            //TODO: Change instanceType
            instanceType: "m5.large",
            //TODO: Change privateIpAddress
            privateIpAddress: "10.230.12.140",
            keyName: Params.sshKeyName,
            imageId: amiMap["win2016"]["eu-west-1"],
            securityGroupIds: [commonSvcSgId, sepEC2InstanceSG.securityGroupId],
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
                        volumeSize: 120,
                        volumeType: "gp2"
                    }
                },
                {
                    deviceName: 'xvdb',
                    ebs: {
                        deleteOnTermination: false,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 100,
                        volumeType: "gp2"
                    }
                }
            ]
        });

        cdk.Tag.add(sepEc2Instance, "Name", "AWIWMSEP01A")

        

        //Define the DB subnet group
        /* const rdsSubnetGroup = new rds.CfnDBSubnetGroup(this, "rdsSubnetGroup", {
            subnetIds: [pvtSubnetA.subnetId, pvtSubnetB.subnetId],
            dbSubnetGroupName: "sep-rds-subnet-group",
            dbSubnetGroupDescription: "subnet group for rds instance"
        }) */


        const sepRDSInstanceSG = new ec2.SecurityGroup(this, "SG-INFRA-TOOLS-SEP-RDS", {
            vpc: vpc,
            allowAllOutbound: true,
            securityGroupName: "SG-INFRA-TOOLS-SEP-RDS",
            description: "SG for SEP RDS instance"
        });

        cdk.Tag.add(sepRDSInstanceSG, "Name", "SG-INFRA-TOOLS-SEP-RDS")

        sepRDSInstanceSG.addIngressRule(sepEC2InstanceSG, ec2.Port.tcp(1433), "MSSQL client port")
        
        const sepRdsInstance = new rds.CfnDBInstance(this, 'sepRdsInstance', {
            allocatedStorage: "200",
            allowMajorVersionUpgrade: false,
            autoMinorVersionUpgrade: true,
            backupRetentionPeriod: 35,
            copyTagsToSnapshot: true,
            dbInstanceClass: "db.m5.large",
            dbInstanceIdentifier: "SEPDB",
            dbSubnetGroupName: "rds-subnetgroup-prod-1-cf",
            deleteAutomatedBackups: false,
            deletionProtection: true,
            engine: "sqlserver-se",
            engineVersion: "14.00.3223.3.v1",
            kmsKeyId: Params.RdsKMSKeyId,
            masterUsername: dbUserName.valueAsString,
            masterUserPassword: dbPassword.valueAsString,
            multiAz: true,
            port: "1433",
            publiclyAccessible: false,
            storageEncrypted: true,
            licenseModel:"license-included",
            storageType: "gp2",
            vpcSecurityGroups: [sepRDSInstanceSG.securityGroupId]
        })
        
        cdk.Tag.add(sepRdsInstance, "Name", "SEPDB") 
        
        // Add tags
        const sepTags = [
            { "application": "Symantec Endpoint Protection"},
            { "customer": "J2C-ACN" },
            { "product": "SEP" },
            { "stage": "prod" },
            { "billing_customer_code": "ZF010" },
            { "billing_wbs_code": "FP.08001.152" }
        ]

        sepTags.forEach(tag => {
            let value = Object.values(tag).toString()
            cdk.Tag.add(sepEc2Instance, Object.keys(tag)[0], value)
            cdk.Tag.add(sepRdsInstance, Object.keys(tag)[0], value)
        })


    }
}