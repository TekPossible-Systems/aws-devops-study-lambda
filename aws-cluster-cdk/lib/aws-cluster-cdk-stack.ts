import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigw_int from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as iam from 'aws-cdk-lib/aws-iam';
import cluster from 'cluster';
import { readFileSync } from 'fs';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsClusterCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC
    const cluster_vpc = new ec2.Vpc(this, 'Cluster_VPC', {
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
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
      layers: [lambda_layer],
      timeout: cdk.Duration.seconds(10)
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

    const iam_role = new iam.Role(this, "ec2-instancerole", {
      roleName: 'ec2-cluster-instance-role',
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com")
    });

    iam_role.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(this, "Cluster_SSM_Role", "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"));

    const instanceProfile = new iam.InstanceProfile(this, "ec2-instanceprofile", {
      instanceProfileName: "cluster-ec2-instance-profile",
      role: iam_role
    });

    const securityGroup = new ec2.SecurityGroup(this, 'ec2-cluster-sg', {
      securityGroupName: "Cluster_Security_Group",
      vpc: cluster_vpc,
    });
    securityGroup.addIngressRule(ec2.Peer.ipv4("10.0.0.0/16"), ec2.Port.HTTPS, "Cluster WEBAPI OUT")
    var userdata_commands = readFileSync("../server/userdata.sh", "utf-8");
    const userData = ec2.UserData.forLinux();
    userData.addCommands(userdata_commands);
    // Add ASG/EC2 instances
    const launchTemplate = new ec2.LaunchTemplate(this, 'EC2-Cluster-LT', {
      requireImdsv2: true,
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      instanceProfile: instanceProfile,
      instanceType: new ec2.InstanceType("m4.xlarge"),
      launchTemplateName: "Cluster_LaunchTemplate",
      userData: userData,
      securityGroup: securityGroup

    })
    const scaling_group = new autoscaling.AutoScalingGroup(this, 'Cluster_ASG', {
      vpc: cluster_vpc,
      launchTemplate: launchTemplate,
      minCapacity: 6,
      maxCapacity: 8,
      vpcSubnets: cluster_vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }),
      autoScalingGroupName: "Cluster_ASG"
    });

    ssm_param_hosts.grantRead(iam_role) 
    ssm_param_hosts.grantWrite(iam_role)


    const api_gw_url = new ssm.StringParameter(this, 'ssm-api-gw-url', {
      stringValue: cluster_api.url + "v1/api",
      parameterName: 'api-gw-url'
    });

  }

}
