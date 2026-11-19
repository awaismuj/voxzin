export interface SecurityPathDetection {
  attack: string;
  rule: string;
}

function decodePath(path: string) {
  let decoded = path;
  for (let i = 0; i < 2; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded.replace(/\\/g, '/').toLowerCase();
}

export function classifySuspiciousPath(path: string): SecurityPathDetection | null {
  const decoded = decodePath(path);
  if (/(?:^|\/)\.\.(?:\/|$)/.test(decoded)) return { attack: 'PATH TRAVERSAL', rule: 'path-traversal' };
  if (/(?:^|\/)\.env(?:$|[./_-])/.test(decoded) || /(?:^|\/)\.git(?:\/|$)/.test(decoded)) {
    return { attack: 'SENSITIVE FILE PROBE', rule: 'sensitive-config-path' };
  }
  if (
    /(?:^|\/)(?:wp-admin(?:\/|$)|wp-login\.php$|xmlrpc\.php$|vendor\/phpunit(?:\/|$))/.test(decoded) ||
    /\.php(?:$|\/)/.test(decoded)
  ) {
    return { attack: 'PHP EXPLOIT', rule: 'php-exploit-path' };
  }
  if (
    /(?:^|\/)(?:\.htaccess|\.htpasswd|id_rsa|web\.config|composer\.(?:json|lock)|database\.sql)(?:$|\/)/.test(decoded) ||
    /\.(?:bak|backup|old|orig|dist|swp)$/.test(decoded)
  ) {
    return { attack: 'SENSITIVE FILE PROBE', rule: 'sensitive-file-path' };
  }
  return null;
}
