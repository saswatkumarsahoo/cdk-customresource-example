import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda'
import * as path from 'path';
import * as cr from '@aws-cdk/custom-resources';
import * as ssm from '@aws-cdk/aws-ssm';
import * as s3 from '@aws-cdk/aws-s3';
import { CustomResource } from '@aws-cdk/core';


export class CustomeResourceExampleStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        const ssmParam= new ssm.StringParameter(this, "ssmParam", {
            stringValue: "John Doe",
            simpleName: true,
            parameterName:  "Username"
        });

        const s3Bucket = new s3.Bucket(this, "s3Bucket",{
           removalPolicy: cdk.RemovalPolicy.RETAIN,
        })


        const lambdaFn = new lambda.Function(this, "customeResource", {
            handler: 'onEvent.handler',
            runtime: lambda.Runtime.NODEJS_12_X,
            code: lambda.InlineCode.fromAsset(path.join(__dirname, '../../lambda/')),
            timeout: cdk.Duration.seconds(30),
            functionName: `exercise-lambda`
            
        });

        ssmParam.grantRead(lambdaFn);
        lambdaFn.addEnvironment("BUCKET_NAME", s3Bucket.bucketName);
        s3Bucket.grantReadWrite(lambdaFn);

    
       const myProvider = new cr.Provider(this, 'MyProvider', {
            onEventHandler: lambdaFn,
        });

        const customeRes = new CustomResource(this, 'customeRes', {
            serviceToken: myProvider.serviceToken,
            properties:{
                "parameterName": ssmParam.parameterName,
                "change" : "commit id -2"
            },
        });

        customeRes.node.addDependency(ssmParam) ;

    }
}