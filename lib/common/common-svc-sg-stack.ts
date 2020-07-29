import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import { Params } from '../infra-tools/params'

export interface StackProps {
    vpcId: string
    sgName: string
  }

export class CommonSvcSGStack extends cdk.Stack {

    constructor(scope: cdk.App, id: string, props: StackProps) {
        super(scope, id);
         // VPC where the security group will be created
         const vpc = ec2.Vpc.fromVpcAttributes(this, 'vpc', {
            vpcId: props.vpcId,
            availabilityZones: ['eu-west-1a'],
            publicSubnetIds: [Params.pubSubnetA]
        })

        const commonSvcSgId = new ec2.SecurityGroup(this, 'commonSvcSgId', {
            vpc: vpc,
            allowAllOutbound: true,
            description: 'allow all outbound traffic',
            securityGroupName:  props.sgName,
        });

        cdk.Tag.add(commonSvcSgId, 'Name', props.sgName)

        //Jumphost SG as Parameter
        const BastionHostSGId = new cdk.CfnParameter(this, "BastionHostSGId")
        
        const BastionHostSG = ec2.SecurityGroup.fromSecurityGroupId(this, "BastionHostSG", BastionHostSGId.valueAsString)
        
        commonSvcSgId.addIngressRule(BastionHostSG, ec2.Port.tcp(22), "SSH from bastion hosts")
        commonSvcSgId.addIngressRule(BastionHostSG, ec2.Port.tcp(3389), "RDP from bastion hosts")

        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.tcp(53), "tcp_53_DNSRoute53")
        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.udp(53), "udp_53_DNSRoute53")

        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.tcp(464), "tcp_464_kerberoespasswordv5")
        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.udp(464), "udp_464_kerberoespasswordv5")

        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.tcpRange(49152,65535), "tcp_49152-65535_dynamic ports")
        
        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.tcp(389), "tcp_389_ldap")
        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.udp(389), "udp_389_ldap")

        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.udp(123), "udp_123_ntp")

        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.tcp(445), "tcp_445_smb")

        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.allIcmp(), "icmp_ping")

        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.tcp(88), "tcp_88_kerberoes")
        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.tcp(135), "tcp_135_rpc")

        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.tcp(636), "tcp_636_ldap_ssl")
        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.udp(636), "udp_636_ldap_ssl")
        
        commonSvcSgId.addIngressRule(ec2.Peer.ipv4('10.229.4.0/22'), ec2.Port.tcp(3269), "tcp_3269_GC")


        new cdk.CfnOutput(this, "commonSvcSgIdExport", {
            exportName: "CommonServicecSGId",
            value: commonSvcSgId.securityGroupId,
            description: "import value for cross stack reference"
        })
    }
}