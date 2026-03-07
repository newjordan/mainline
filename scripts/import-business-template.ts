import fs from 'fs';
import path from 'path';

type AnyRecord = Record<string, unknown>;

interface AssetImports {
  logoIconFile?: string;
  logoHorizontalFile?: string;
  logoStackedFile?: string;
  heroPhotoFile?: string;
  paymentSuccessFile?: string;
}

interface BusinessTemplateInput extends AnyRecord {
  assetImports?: AssetImports;
}

const repoRoot = process.cwd();
const profilePath = path.join(repoRoot, 'config', 'business-profile.json');
const envLocalPath = path.join(repoRoot, '.env.local');
const envExamplePath = path.join(repoRoot, '.env.example');
const templateAssetsDir = path.join(repoRoot, 'public', 'images', 'mainline');

function exitWithUsage(): never {
  console.error('Usage: npm run template:import -- <path-to-business-profile.json>');
  console.error('Example: npm run template:import -- templates/business-profile.example.json');
  process.exit(1);
}

function readJsonFile(filePath: string): AnyRecord {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('JSON root must be an object.');
    }

    return parsed as AnyRecord;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON parse error';
    throw new Error(`Failed to read JSON at ${filePath}: ${message}`);
  }
}

function mergeDeep(base: unknown, patch: unknown): unknown {
  if (Array.isArray(base) && Array.isArray(patch)) {
    return patch;
  }

  if (
    base &&
    patch &&
    typeof base === 'object' &&
    typeof patch === 'object' &&
    !Array.isArray(base) &&
    !Array.isArray(patch)
  ) {
    const merged: AnyRecord = { ...(base as AnyRecord) };
    for (const [key, value] of Object.entries(patch as AnyRecord)) {
      merged[key] = mergeDeep((base as AnyRecord)[key], value);
    }
    return merged;
  }

  return patch === undefined ? base : patch;
}

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function resolveTemplatePath(inputValue: string, templateDir: string): string {
  if (path.isAbsolute(inputValue)) {
    return inputValue;
  }

  return path.resolve(templateDir, inputValue);
}

function copyOptionalAsset(params: {
  label: string;
  sourcePath?: string;
  templateDir: string;
  outputBaseName: string;
}): string | null {
  const { label, sourcePath, templateDir, outputBaseName } = params;
  if (!sourcePath) return null;

  const resolvedSource = resolveTemplatePath(sourcePath, templateDir);
  if (!fs.existsSync(resolvedSource)) {
    throw new Error(`${label} file not found: ${resolvedSource}`);
  }

  const extension = path.extname(resolvedSource).toLowerCase();
  const safeExtension = extension || '.png';
  const outputFilename = `${outputBaseName}${safeExtension}`;
  const outputPath = path.join(templateAssetsDir, outputFilename);

  fs.copyFileSync(resolvedSource, outputPath);
  return `/images/mainline/${outputFilename}`;
}

function upsertEnvVar(content: string, key: string, value: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lineRegex = new RegExp(`^${escapedKey}=.*$`, 'm');
  const nextLine = `${key}=${value}`;

  if (lineRegex.test(content)) {
    return content.replace(lineRegex, nextLine);
  }

  const trimmed = content.endsWith('\n') ? content : `${content}\n`;
  return `${trimmed}${nextLine}\n`;
}

function ensureEnvLocalExists(): void {
  if (fs.existsSync(envLocalPath)) {
    return;
  }

  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envLocalPath);
    return;
  }

  fs.writeFileSync(envLocalPath, '', 'utf8');
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

function main() {
  const templateArg = process.argv[2];
  if (!templateArg) {
    exitWithUsage();
  }

  const templatePath = path.resolve(repoRoot, templateArg);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }

  const templateDir = path.dirname(templatePath);
  const currentProfile = readJsonFile(profilePath);
  const input = readJsonFile(templatePath) as BusinessTemplateInput;

  const assetImports = (input.assetImports || {}) as AssetImports;
  delete input.assetImports;

  const mergedProfile = mergeDeep(currentProfile, input) as AnyRecord;

  ensureDirectory(templateAssetsDir);

  const logoIconSrc = copyOptionalAsset({
    label: 'logoIconFile',
    sourcePath: assetImports.logoIconFile,
    templateDir,
    outputBaseName: 'logo-icon',
  });
  const logoHorizontalSrc = copyOptionalAsset({
    label: 'logoHorizontalFile',
    sourcePath: assetImports.logoHorizontalFile,
    templateDir,
    outputBaseName: 'logo-horizontal',
  });
  const logoStackedSrc = copyOptionalAsset({
    label: 'logoStackedFile',
    sourcePath: assetImports.logoStackedFile,
    templateDir,
    outputBaseName: 'logo-stacked',
  });
  const heroPhotoSrc = copyOptionalAsset({
    label: 'heroPhotoFile',
    sourcePath: assetImports.heroPhotoFile,
    templateDir,
    outputBaseName: 'owner-photo',
  });
  const paymentSuccessImageSrc = copyOptionalAsset({
    label: 'paymentSuccessFile',
    sourcePath: assetImports.paymentSuccessFile,
    templateDir,
    outputBaseName: 'payment-success',
  });

  const assets = (mergedProfile.assets || {}) as AnyRecord;
  if (logoIconSrc) assets.logoIconSrc = logoIconSrc;
  if (logoHorizontalSrc) assets.logoHorizontalSrc = logoHorizontalSrc;
  if (logoStackedSrc) assets.logoStackedSrc = logoStackedSrc;
  if (heroPhotoSrc) assets.heroPhotoSrc = heroPhotoSrc;
  if (paymentSuccessImageSrc) assets.paymentSuccessImageSrc = paymentSuccessImageSrc;
  mergedProfile.assets = assets;

  fs.writeFileSync(profilePath, `${JSON.stringify(mergedProfile, null, 2)}\n`, 'utf8');

  ensureEnvLocalExists();
  let envContent = fs.readFileSync(envLocalPath, 'utf8');

  const defaults = (mergedProfile.defaults || {}) as AnyRecord;
  const websiteUrl = asString(defaults.websiteUrl);
  const smsPhone = asString(defaults.smsPhoneE164);
  const callPhone = asString(defaults.callPhoneE164);
  const adminPhone = asString(defaults.adminPhoneE164);
  const allowedEmails = asStringArray(defaults.allowedEmails);

  if (websiteUrl) {
    envContent = upsertEnvVar(envContent, 'NEXT_PUBLIC_SITE_URL', websiteUrl);
  }
  if (smsPhone) {
    envContent = upsertEnvVar(envContent, 'TWILIO_PHONE_NUMBER', smsPhone);
  }
  if (callPhone) {
    envContent = upsertEnvVar(envContent, 'BUSINESS_PHONE_NUMBER', callPhone);
  }
  if (adminPhone) {
    envContent = upsertEnvVar(envContent, 'ADMIN_PHONE_NUMBER', adminPhone);
  }
  if (allowedEmails.length > 0) {
    envContent = upsertEnvVar(envContent, 'ALLOWED_EMAILS', allowedEmails.join(','));
  }

  fs.writeFileSync(envLocalPath, envContent, 'utf8');

  console.log('Template import complete.');
  console.log(`- Updated profile: ${path.relative(repoRoot, profilePath)}`);
  console.log(`- Updated env file: ${path.relative(repoRoot, envLocalPath)}`);
  console.log('- Optional assets copied to: public/images/mainline');
  console.log('Next step: fill in remaining secrets in .env.local, then run npm run dev');
}

main();
