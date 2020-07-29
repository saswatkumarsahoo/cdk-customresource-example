export class Params {
    public static readonly vpcId = "vpc-0bd74b68d5a6bb73c" ;
    
    public static readonly pubSubnetA = "subnet-0c40cbec69429762a" ;
    public static readonly pubSubnetB = "subnet-066a7d67f891f37e0" ;
    public static readonly pubSubnetC = "subnet-0505f8367b37c87c4" ;

    public static readonly pvtSubnetA = "subnet-05b0c5da818466406" ;
    public static readonly pvtSubnetB = "subnet-0e2907379b1bebd8e" ;
    public static readonly pvtSubnetC = "subnet-07eb67391ccbf4dcb" ;
    
    // KMS Key ARNs
    public static readonly EbsKMSKeyId = "arn:aws:kms:eu-west-1:850415895400:key/05f3a1d1-29f3-495b-a6f2-a6b17dd67437";
    public static readonly RdsKMSKeyId = "arn:aws:kms:eu-west-1:850415895400:key/687908fe-e8a0-4939-849d-e84a0df4e352";
    public static readonly RdsS3KeyId = "arn:aws:kms:eu-west-1:850415895400:key/f3fe8c26-93ee-447c-9fb5-f123c35d0dbc"
    
    // SSH Keys
    public static readonly sshKeyName = "ACN-SW-DELIVERY-PROD" ;

}