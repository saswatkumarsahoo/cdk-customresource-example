#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import {CustomeResourceExampleStack} from '../lib/custom-resources/custom-resource-stack'

const app = new cdk.App();

new CustomeResourceExampleStack(app, 'CustomResourcesStack')

