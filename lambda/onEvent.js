let AWS = require('aws-sdk');
const ssm = new AWS.SSM();
const s3 = new AWS.S3();


exports.handler = async function (event, context) {
    console.log(`incoming event ${JSON.stringify(event)}`);

    switch (event.RequestType) {
        case 'Create':  case 'Update':
            try {
                var params = {
                    Name: event.ResourceProperties.parameterName,
                };
                let ssmResponse = await ssm.getParameter(params).promise();
                console.log(`response ${JSON.stringify(ssmResponse)} from paramaterStore`);

                // Write to S3 bucket 
                var params = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: `${event.RequestId}.txt`,
                    Body: `${ssmResponse.Parameter.Name} = ${ssmResponse.Parameter.Value}`,
                    ContentType: 'text/plain',
                };

                let s3Response = await s3.upload(params).promise();
                console.log(s3Response)
                return { "message": "create/update event sucessful" }
            }
            catch (error) {
                return { "message": "create event failed", }
            }

        case 'Delete':
            // Optional - try delete the file from S3
            return { "message": "delete event sucessful" }
    }

};
