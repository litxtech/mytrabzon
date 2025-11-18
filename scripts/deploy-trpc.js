#!/usr/bin/env node

/**
 * Deploy TRPC Edge Function to Supabase
 * 
 * Usage:
 *   node scripts/deploy-trpc.js
 * 
 * Or with project ref:
 *   SUPABASE_PROJECT_REF=xcvcplwimicylaxghiak node scripts/deploy-trpc.js
 */

const { execSync } = require('child_process');
const path = require('path');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'xcvcplwimicylaxghiak';

console.log('🚀 Deploying TRPC Edge Function...');
console.log(`📌 Project Ref: ${PROJECT_REF}`);
console.log('');

try {
  // Check if Supabase CLI is installed
  try {
    execSync('supabase --version', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ Supabase CLI is not installed!');
    console.error('');
    console.error('Please install it first:');
    console.error('  npm install -g supabase');
    console.error('  or');
    console.error('  brew install supabase/tap/supabase');
    process.exit(1);
  }

  // Link to project if not already linked
  try {
    execSync(`supabase link --project-ref ${PROJECT_REF}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
  } catch (error) {
    // Link might fail if already linked, that's okay
    console.log('ℹ️  Project link check (may already be linked)');
  }

  // Deploy the function
  console.log('📦 Deploying trpc function...');
  execSync('supabase functions deploy trpc --no-verify-jwt', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      SUPABASE_PROJECT_REF: PROJECT_REF,
    },
  });

  console.log('');
  console.log('✅ Successfully deployed TRPC Edge Function!');
  console.log('');
  console.log('🔗 Function URL: https://' + PROJECT_REF + '.supabase.co/functions/v1/trpc');
  
} catch (error) {
  console.error('');
  console.error('❌ Deployment failed!');
  console.error('');
  console.error('Common issues:');
  console.error('  1. Make sure you have SUPABASE_ACCESS_TOKEN set in your environment');
  console.error('  2. Check that your project ref is correct:', PROJECT_REF);
  console.error('  3. Verify you have permission to deploy to this project');
  console.error('');
  console.error('To set access token:');
  console.error('  export SUPABASE_ACCESS_TOKEN=your_token_here');
  console.error('');
  process.exit(1);
}

