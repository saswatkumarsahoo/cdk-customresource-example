#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { LocalAppStack } from '../lib/local-app-stack';

const app = new cdk.App();
new LocalAppStack(app, 'LocalAppStack');
