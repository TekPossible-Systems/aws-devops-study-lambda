import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigw_int from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import cluster from 'cluster';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsClusterCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC
    const cluster_vpc = new ec2.Vpc(this, 'Cluster_VPC', {
      subnetConfiguration: [
        {
          cidrMask: 24, 
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        }
      ],
      natGateways: 1
    }); 

    // Create Lambda Function and API Gateway
    const lambda_layer = new lambda.LayerVersion(this, 'lambda_layer', {
      code: lambda.Code.fromAsset("../lambda/layer_content.zip"),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9]
    });

    const lambda_function = new lambda.Function(this, 'Lambda-Function-VPC', {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset("../lambda/"),
      handler: 'lambda.lambda_handler',
      vpc: cluster_vpc,
      vpcSubnets: cluster_vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }),
      layers: [lambda_layer]
    });

    const api_gw_lambda_integration = new apigw_int.HttpLambdaIntegration('LAMBDA_API_INTG', lambda_function, {
      timeout: cdk.Duration.seconds(10)
    });
    const cluster_api = new apigw.HttpApi(this, 'HTTP-API', {
      apiName: 'tekpossible-cluster-api',
    });
    
    cluster_api.addRoutes({
        path: '/api',
        integration: api_gw_lambda_integration,
        methods: [apigw.HttpMethod.GET]
        
    });

    cluster_api.addStage('v1', {
      stageName: 'v1',
      description: 'Version 1 of TEKP CLUSTER API',
      autoDeploy: true // why not, right - lets push to prod!
    });

    

    const ssm_param_hosts = new ssm.StringParameter(this, 'ssm-cluster-host-list', {
      stringValue: "[\"0.0.0.0\"]",
      parameterName: 'cluster-host-list'
    });

    ssm_param_hosts.grantRead(lambda_function);
    // ssm_param_hosts.grantRead() EC2 Instances
    // ssm_param_hosts.grantWrite() EC2 Instances


    const api_gw_url = new ssm.StringParameter(this, 'ssm-api-gw-url', {
      stringValue: cluster_api.url + "v1/api",
      parameterName: 'api-gw-url'
    });

  }

}
