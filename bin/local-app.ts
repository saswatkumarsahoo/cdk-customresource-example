#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { MyWizardStack } from '../lib/infra-tools/my-wizard-stack';
import { SandboxStack } from '../lib/sandbox/sandbox-stack'
import { CommonSvcSGStack } from '../lib/common/common-svc-sg-stack';
import { Params } from '../lib/infra-tools/params'

import { SEPStack } from '../lib/infra-tools/sep-stack'
import {JumpHostStack} from '../lib/infra-tools/jump-hosts-stack'

import {SwDeliveryJumpHostStack} from '../lib/sw-delivery/jump-hosts-stack'


const app = new cdk.App();
const envEU = { region: 'eu-west-1' };


/********************************************************
 * START : INFRA TOOLS
 ********************************************************/
// Stack for Jumphost
new JumpHostStack(app, 'JumpHostStack', { env: envEU });

// Stack for common services security group in INFRA-TOOLS
new CommonSvcSGStack(app, 'SG-INFRA-TOOLS-CommonServices', {
    vpcId: "vpc-0e210cfda09e911c0",
    sgName: "SG-INFRA-TOOLS-CommonServices"
});

// Stack for MyWizard
new MyWizardStack(app, 'MyWizardStack', { env: envEU });

// SEP stack
new SEPStack(app, 'SEPStack', { env: envEU });

/********************************************************
 * END : INFRA TOOLS
 ********************************************************/


 
/********************************************************
 * START : SW DELIVERY
 ********************************************************/

// Stack for common services security group in SW-DELIVERY
new CommonSvcSGStack(app, 'SG-SW-DELIVERY-CommonServices', {
    vpcId: "vpc-0bd74b68d5a6bb73c",
    sgName: "SG-SW-DELIVERY-CommonServices"
});

new SwDeliveryJumpHostStack(app, 'SwDeliveryJumpHostStack');

/********************************************************
 * START : END DELIVERY
 ********************************************************/