import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as firewall from '../firewall'


export class SandboxStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // TODO - Create Paramaters from these
        const vpcId = new cdk.CfnParameter(this, 'vpcId', {
            default: 'vpc-094225b67fb1caa73'
        })
        const pubSubnetA = new cdk.CfnParameter(this, 'pubSubnetA', {
            default: 'subnet-0d59b5d144933d176'
        })
        const keyName = new cdk.CfnParameter(this, 'keyName', {
            default: 'ACN-EUC-AUTH-PROD'
        })

        const instanceType = 't3.micro'
        const amiMap = { 'eu-west-1': "ami-0202869bdd0fc8c75" }

        const vpc = ec2.Vpc.fromVpcAttributes(this, 'vpc', {
            vpcId: vpcId.valueAsString,
            availabilityZones: ['eu-west-1a'],
            publicSubnetIds: [pubSubnetA.valueAsString]
        })

        const commonSG = new firewall.CommonSG(this, "commonSG", {
            vpc: vpc,
            sgName: "SG-EUC-AUTH-CommonServices"
        })

        const sandboxSG = new ec2.SecurityGroup(this, 'SandboxTesting', {
            vpc: vpc,
            allowAllOutbound: true,
            description: 'allow all outbound traffic'
        });
        cdk.Tag.add(sandboxSG, 'Name', 'SG-EUC-AUTH-SandboxTesting')


        sandboxSG.addIngressRule(ec2.Peer.ipv4('83.83.10.226/32'), ec2.Port.tcp(22), "allow SSH access")

        const instanceProfile = new iam.Role(this, 'instanceRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')]

        })

        const rhelInstance = new ec2.Instance(this, 'rhelInstance', {
            instanceType: new ec2.InstanceType(instanceType),
            machineImage: ec2.MachineImage.genericLinux(amiMap),
            vpc: vpc,
            securityGroup: sandboxSG,
            keyName: keyName.valueAsString,
            role: instanceProfile,
            blockDevices: [
                {
                    deviceName: '/dev/sda1',
                    volume: ec2.BlockDeviceVolume.ebs(10,
                        {
                            encrypted: true,
                            deleteOnTermination: true,
                            volumeType: ec2.EbsDeviceVolumeType.GP2
                        }
                    ),
                }
            ]

        })
        rhelInstance.userData.addCommands(
            "yum -y update",
            "yum install -y https://s3.eu-west-1.amazonaws.com/amazon-ssm-eu-west-1/latest/linux_amd64/amazon-ssm-agent.rpm",
            "systemctl status amazon-ssm-agent"
        )

        cdk.Tag.add(rhelInstance, 'Name', 'AWILMRHL01A')
        const eip = new ec2.CfnEIP(this, 'RhelEIP', { instanceId: rhelInstance.instanceId })

    }
}