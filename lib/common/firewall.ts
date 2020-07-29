import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';

export interface StackProps {
    vpc: ec2.IVpc;
    sgName: string
  }
  

// This is an abstacted construct for common SG to create in each VPC
export class CommonSG extends cdk.Construct {

    public readonly securityGroup: ec2.SecurityGroup
    
    constructor(scope: cdk.Construct, id: string, props: StackProps) {
        super(scope, id);
        this.securityGroup = new ec2.SecurityGroup(this, 'securityGroup', {
            vpc: props.vpc,
            allowAllOutbound: true,
            description: 'allow all outbound traffic'
        });
        cdk.Tag.add(this.securityGroup, 'Name', props.sgName)
        this.securityGroup.addIngressRule(ec2.Peer.ipv4('83.83.10.226/32'), ec2.Port.tcp(22), "allow SSH access")
        
    }
}