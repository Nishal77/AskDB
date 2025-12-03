#!/bin/bash

set -e

echo "🌍 Initializing Terraform..."

cd infra/terraform

# Initialize Terraform
terraform init

echo "✅ Terraform initialized!"
echo "📝 Next steps:"
echo "   1. Create terraform.tfvars file with your variables"
echo "   2. Run: terraform plan"
echo "   3. Run: terraform apply"

