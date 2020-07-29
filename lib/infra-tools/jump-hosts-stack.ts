import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import { Params } from './params'
import { CfnParameter } from '@aws-cdk/core';



export class JumpHostStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props)
        const amiMap = {
            "win20219":
                { 'eu-west-1': "ami-08b8bf0a2fb1864a2" }
        }

        // VPC 
        const vpc = ec2.Vpc.fromVpcAttributes(this, 'vpc', {
            vpcId: Params.vpcId,
            availabilityZones: ['eu-west-1a'],
            publicSubnetIds: [Params.pubSubnetA, Params.pubSubnetB]
        })
       

        const sgBastionSG = new ec2.SecurityGroup(this, "SG-INFRA-TOOLS-Bastion", {
            vpc: vpc,
            allowAllOutbound: false,
            securityGroupName: "SG-INFRA-TOOLS-Bastion",
            description: "SG for bastion host"
        });

        cdk.Tag.add(sgBastionSG, 'Name', "SG-INFRA-TOOLS-Bastion")

        sgBastionSG.addIngressRule(ec2.Peer.ipv4('170.251.192.0/24'), ec2.Port.tcp(22), "SSH from Accneture VPN")
        sgBastionSG.addIngressRule(ec2.Peer.ipv4('170.251.192.0/24'), ec2.Port.tcp(3389), "RDP from Accneture VPN")

        sgBastionSG.addEgressRule(ec2.Peer.ipv4('10.230.12.0/22'), ec2.Port.tcp(3389), "RDP to VPC Hosts")
        sgBastionSG.addEgressRule(ec2.Peer.ipv4('10.230.12.0/22'), ec2.Port.tcp(22), "SSH to VPC Hosts")

        sgBastionSG.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(80), "Allow outbound HTTP")
        sgBastionSG.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(443), "Allow outbound HTTPS")

        const jumpHost = new ec2.CfnInstance(this, 'jumpHostTemp', {
            availabilityZone: "eu-west-1a",
            subnetId: Params.pubSubnetA,
            //TODO: Change instanceType
            instanceType: "t3a.medium",
            //TODO: Change privateIpAddress
            privateIpAddress: "10.230.12.5",
            keyName: Params.sshKeyName,
            imageId: amiMap["win20219"]["eu-west-1"],
            securityGroupIds: [sgBastionSG.securityGroupId],
            disableApiTermination: true,
            monitoring: true,
            blockDeviceMappings: [
                {
                    deviceName: '/dev/sda1',
                    ebs: {
                        deleteOnTermination: true,
                        encrypted: true,
                        kmsKeyId: Params.EbsKMSKeyId,
                        volumeSize: 30,
                        volumeType: "gp2"
                    }
                }
            ]
        });

        // Delete the jumphost in case of stack deletion
        jumpHost.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)
        const eip = new ec2.CfnEIP(this, 'jumpHostEIP', { instanceId: jumpHost.ref })
    
        const jumpHostTags = [
            {"Name": "AWIWMBST01A" },
            { "application": "jumphost" },
            { "customer": "J2C-ACN" }, // ACC or ACN ?
            { "product": "Bastion Host" },
            { "stage": "prod" }, // prod or production ?
            { "billing_customer_code": "ZF010" },
            { "billing_wbs_code": "FP.08001.152" }
        ]
        jumpHostTags.forEach(tag => {
            let value = Object.values(tag).toString()
            cdk.Tag.add(jumpHost, Object.keys(tag)[0], value)
        })

    }
}