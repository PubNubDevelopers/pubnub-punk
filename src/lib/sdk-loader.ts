import type PubNub from 'pubnub';

export interface SdkVersionInfo {
  version: string;
  cdnUrl: string;
  releaseNotes: string;
}

const MANIFEST_URL = '/sdk-versions.json';
const GITHUB_TAGS_URL = 'https://api.github.com/repos/pubnub/javascript/tags?per_page=50';
const SDK_SCRIPT_ATTR = 'data-pubnub-sdk';
const SESSION_CACHE_KEY = 'pubnub-sdk-versions';
const DEFAULT_VERSION = '10.1.0';
const DEFAULT_VERSION_INFO: SdkVersionInfo = {
  version: DEFAULT_VERSION,
  cdnUrl: `https://cdn.pubnub.com/sdk/javascript/pubnub.${DEFAULT_VERSION}.min.js`,
  releaseNotes: 'Default fallback version',
};

let manifestPromise: Promise<SdkVersionInfo[]> | null = null;
let resolvedVersions: SdkVersionInfo[] | null = null;
let currentVersion: string | null = null;
const inFlightLoads = new Map<string, Promise<void>>();

function removeExistingSdkScripts() {
  document
    .querySelectorAll(`script[${SDK_SCRIPT_ATTR}]`)
    .forEach((script) => script.parentElement?.removeChild(script));
  if (typeof window !== 'undefined') {
    delete (window as any).PubNub;
  }
}

function injectScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.defer = true;
    script.setAttribute(SDK_SCRIPT_ATTR, 'true');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load PubNub SDK from ${url}`));
    document.head.appendChild(script);
  });
}

function normalizeVersion(tagName: string): string | null {
  if (!tagName) return null;
  const cleaned = tagName.startsWith('v') || tagName.startsWith('V') ? tagName.slice(1) : tagName;
  return /^\d+\.\d+\.\d+$/.test(cleaned) ? cleaned : null;
}

function buildVersionInfo(version: string, releaseNotes = 'GitHub tag'): SdkVersionInfo {
  return {
    version,
    cdnUrl: `https://cdn.pubnub.com/sdk/javascript/pubnub.${version}.min.js`,
    releaseNotes,
  };
}

function compareVersionsDesc(a: string, b: string): number {
  const parse = (v: string) => v.split('.').map((part) => parseInt(part, 10));
  const [aMajor, aMinor, aPatch] = parse(a);
  const [bMajor, bMinor, bPatch] = parse(b);

  if (aMajor !== bMajor) return bMajor - aMajor;
  if (aMinor !== bMinor) return bMinor - aMinor;
  return bPatch - aPatch;
}

async function fetchGithubVersions(): Promise<SdkVersionInfo[]> {
  if (typeof window === 'undefined') return [];

  try {
    const cachedRaw = window.sessionStorage?.getItem(SESSION_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as SdkVersionInfo[];
      if (Array.isArray(cached) && cached.length > 0) {
        return cached;
      }
    }
  } catch (error) {
    console.warn('Failed to read cached SDK versions', error);
  }

  try {
    const response = await fetch(GITHUB_TAGS_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub tags request failed (${response.status})`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }

    const versions: SdkVersionInfo[] = [];
    for (const tag of data) {
      const version = normalizeVersion(tag?.name);
      if (!version) continue;
      versions.push(buildVersionInfo(version, `GitHub tag ${tag.name}`));
    }

    if (versions.length > 0 && typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(versions));
      } catch (error) {
        console.warn('Failed to cache SDK versions in sessionStorage', error);
      }
    }

    return versions;
  } catch (error) {
    console.warn('Falling back to local SDK manifest. Reason:', error);
    return [];
  }
}

async function fetchLocalManifest(): Promise<SdkVersionInfo[]> {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unable to load SDK manifest (${response.status})`);
        }
        return response.json();
      })
      .then((data) => data as SdkVersionInfo[])
      .catch((error) => {
        manifestPromise = null;
        console.warn('Failed to load local SDK manifest:', error);
        return [];
      });
  }
  return manifestPromise;
}

async function resolveVersions(): Promise<SdkVersionInfo[]> {
  const versionsMap = new Map<string, SdkVersionInfo>();

  const githubVersions = await fetchGithubVersions();
  githubVersions.forEach((info) => versionsMap.set(info.version, info));

  const manifestVersions = await fetchLocalManifest();
  manifestVersions.forEach((info) => {
    if (!versionsMap.has(info.version)) {
      versionsMap.set(info.version, info);
    }
  });

  if (!versionsMap.size) {
    versionsMap.set(DEFAULT_VERSION_INFO.version, DEFAULT_VERSION_INFO);
  }

  const list = Array.from(versionsMap.values()).sort((a, b) => compareVersionsDesc(a.version, b.version));
  resolvedVersions = list;
  return list;
}

export async function getSdkVersions(): Promise<SdkVersionInfo[]> {
  return resolveVersions();
}

export async function ensurePubNubSdk(version: string): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const versions = await resolveVersions();
  const fallbackVersion = versions[0]?.version || DEFAULT_VERSION;
  const targetVersion = version || fallbackVersion;

  if (!targetVersion) {
    throw new Error('No PubNub SDK versions available');
  }

  if (currentVersion === targetVersion && window.PubNub) {
    return;
  }

  let loadPromise = inFlightLoads.get(targetVersion);
  if (!loadPromise) {
    loadPromise = (async () => {
      let info = versions.find((entry) => entry.version === targetVersion);
      if (!info) {
        info = buildVersionInfo(targetVersion, 'Inferred version');
        if (resolvedVersions) {
          resolvedVersions = [info, ...resolvedVersions].sort((a, b) => compareVersionsDesc(a.version, b.version));
        }
      }

      removeExistingSdkScripts();
      await injectScript(info.cdnUrl);

      if (!window.PubNub) {
        throw new Error('PubNub SDK failed to initialize');
      }

      currentVersion = targetVersion;
    })();
    inFlightLoads.set(targetVersion, loadPromise);
  }

  try {
    await loadPromise;
  } finally {
    inFlightLoads.delete(targetVersion);
  }
}

export function getCurrentSdkVersion(): string | null {
  return currentVersion;
}

export type LoadedPubNubConstructor = typeof PubNub;
