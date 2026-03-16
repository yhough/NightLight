/**
 * Expo Config Plugin: withShareExtension
 * Adds the NightLightShareExtension (Impulse Firewall) as an iOS share extension target.
 *
 * Steps performed during prebuild:
 *  1. withEntitlementsPlist  – adds App Group to the main app
 *  2. withXcodeProject       – adds extension group, source files, and target
 *  3. withDangerousMod       – copies Swift source files into the extension directory
 */

const { withXcodeProject, withEntitlementsPlist, withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

const APP_GROUP     = 'group.com.nightlight.app';
const EXT_NAME      = 'NightLightShareExtension';
const EXT_BUNDLE_ID = 'com.nightlight.app.ShareExtension';
const SOURCE_DIR    = path.join(__dirname, 'shareExtension');

// ─── 1. Add App Group entitlement to the main app ───────────────────────────
function addMainAppGroup(config) {
  return withEntitlementsPlist(config, (mod) => {
    const entitlements = mod.modResults;
    const key = 'com.apple.security.application-groups';
    if (!Array.isArray(entitlements[key])) {
      entitlements[key] = [];
    }
    if (!entitlements[key].includes(APP_GROUP)) {
      entitlements[key].push(APP_GROUP);
    }
    return mod;
  });
}

// ─── 2. Add share extension target to the Xcode project ─────────────────────
function addXcodeTarget(config) {
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;

    // Idempotency: skip if target already exists
    const nativeTargets = project.pbxNativeTargetSection();
    const alreadyExists = Object.values(nativeTargets).some(
      (t) => t && typeof t === 'object' && t.name === EXT_NAME
    );
    if (alreadyExists) {
      console.log(`[withShareExtension] Target "${EXT_NAME}" already exists – skipping.`);
      return mod;
    }

    // ── 2a. Add the native target (creates its own group + build configs) ──
    // addTarget(name, type, subfolder, productBundleId)
    const target = project.addTarget(EXT_NAME, 'app_extension', EXT_NAME, EXT_BUNDLE_ID);

    // ── 2b. Create a PBX group for the extension source files ──────────────
    // addPbxGroup(filePathsArray, name, path, sourceTree)
    // Pass empty array – we'll reference files manually via build phases
    const extGroup = project.addPbxGroup([], EXT_NAME, EXT_NAME, '"<group>"');

    // Add the group to the project's main group so Xcode can see it
    const mainGroupKey = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup({ fileRef: extGroup.uuid, basename: EXT_NAME }, mainGroupKey);

    // ── 2c. Add file references inside the extension group ──────────────────
    const fileRefSection = project.hash.project.objects['PBXFileReference'];

    const addFileRef = (filename, fileType) => {
      const fileKey = project.generateUuid();
      fileRefSection[fileKey] = {
        isa: 'PBXFileReference',
        fileEncoding: 4,
        lastKnownFileType: `"${fileType}"`,
        name: `"${filename}"`,
        path: `"${filename}"`,
        sourceTree: '"<group>"',
      };
      fileRefSection[`${fileKey}_comment`] = filename;

      // Add to the extension group's children
      const groupObj = project.hash.project.objects['PBXGroup'][extGroup.uuid];
      if (groupObj && Array.isArray(groupObj.children)) {
        groupObj.children.push({ value: fileKey, comment: filename });
      }

      return fileKey;
    };

    const swiftKey  = addFileRef('ShareViewController.swift', 'sourcecode.swift');
    addFileRef('Info.plist', 'text.plist.xml');
    addFileRef('NightLightShareExtension.entitlements', 'text.plist.entitlements');

    // ── 2d. Build phases ───────────────────────────────────────────────────
    project.addBuildPhase([], 'PBXSourcesBuildPhase',   'Sources',    target.uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources',  target.uuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase','Frameworks', target.uuid);

    // Add ShareViewController.swift to the Sources build phase of the new target
    const buildFileSection    = project.hash.project.objects['PBXBuildFile'];
    const sourcesPhaseSection = project.hash.project.objects['PBXSourcesBuildPhase'];

    const buildFileKey = project.generateUuid();
    buildFileSection[buildFileKey] = {
      isa: 'PBXBuildFile',
      fileRef: swiftKey,
      fileRef_comment: 'ShareViewController.swift',
    };
    buildFileSection[`${buildFileKey}_comment`] = 'ShareViewController.swift in Sources';

    // Find the sources phase for our new target
    const targetEntry = project.pbxNativeTargetSection()[target.uuid];
    if (targetEntry && targetEntry.buildPhases) {
      for (const phaseRef of targetEntry.buildPhases) {
        const phaseKey = typeof phaseRef === 'object' ? phaseRef.value : phaseRef;
        const phase    = sourcesPhaseSection && sourcesPhaseSection[phaseKey];
        if (phase) {
          if (!Array.isArray(phase.files)) phase.files = [];
          phase.files.push({ value: buildFileKey, comment: 'ShareViewController.swift in Sources' });
          break;
        }
      }
    }

    // ── 2e. Update build settings for the extension target's configurations ─
    const extBuildSettings = {
      ALWAYS_SEARCH_USER_PATHS: 'NO',
      CODE_SIGN_ENTITLEMENTS: `"${EXT_NAME}/NightLightShareExtension.entitlements"`,
      CODE_SIGN_STYLE: 'Automatic',
      CURRENT_PROJECT_VERSION: '1',
      INFOPLIST_FILE: `"${EXT_NAME}/Info.plist"`,
      LD_RUNPATH_SEARCH_PATHS:
        '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
      MARKETING_VERSION: '1.0',
      PRODUCT_BUNDLE_IDENTIFIER: `"${EXT_BUNDLE_ID}"`,
      PRODUCT_NAME: '"$(TARGET_NAME)"',
      SKIP_INSTALL: 'YES',
      SWIFT_VERSION: '5.0',
      TARGETED_DEVICE_FAMILY: '"1"',
    };

    const xcBuildConfigSection = project.hash.project.objects['XCBuildConfiguration'];
    if (xcBuildConfigSection) {
      Object.keys(xcBuildConfigSection).forEach((key) => {
        if (key.endsWith('_comment')) return;
        const cfg = xcBuildConfigSection[key];
        if (
          cfg &&
          typeof cfg === 'object' &&
          cfg.buildSettings &&
          (cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER === `"${EXT_BUNDLE_ID}"` ||
            cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER === EXT_BUNDLE_ID)
        ) {
          Object.assign(cfg.buildSettings, extBuildSettings);
        }
      });
    }

    console.log(`[withShareExtension] Added target "${EXT_NAME}" to Xcode project.`);
    return mod;
  });
}

// ─── 3. Copy Swift source files into the extension directory ─────────────────
function copyExtensionFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (mod) => {
      const iosDir = path.join(mod.modRequest.projectRoot, 'ios');
      const extDir = path.join(iosDir, EXT_NAME);

      if (!fs.existsSync(extDir)) {
        fs.mkdirSync(extDir, { recursive: true });
      }

      const filesToCopy = [
        'ShareViewController.swift',
        'Info.plist',
        'NightLightShareExtension.entitlements',
      ];

      for (const file of filesToCopy) {
        const src  = path.join(SOURCE_DIR, file);
        const dest = path.join(extDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log(`[withShareExtension] Copied ${file} → ios/${EXT_NAME}/${file}`);
        } else {
          console.warn(`[withShareExtension] Source file not found: ${src}`);
        }
      }

      return mod;
    },
  ]);
}

// ─── Main plugin export ───────────────────────────────────────────────────────
const withShareExtension = (config) => {
  config = addMainAppGroup(config);
  config = addXcodeTarget(config);
  config = copyExtensionFiles(config);
  return config;
};

module.exports = withShareExtension;
