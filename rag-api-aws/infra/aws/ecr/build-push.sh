#!/bin/bash

AWS_ACCOUNT_ID=123456789
REGION=us-east-1
REPO=rag-api

docker build -t $REPO .

docker tag $REPO:latest $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO:latest

docker push $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO:latest