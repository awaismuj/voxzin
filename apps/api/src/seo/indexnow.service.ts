import { Injectable, Logger } from '@nestjs/common';
import { submitToIndexNow } from '@voxzin/shared';
import { env } from '../config/env';

/** Tells search engines (Bing, Yandex, ...) that pages are new or changed. Fire-and-forget; production + key only. */
@Injectable()
export class IndexNowService {
  private readonly log = new Logger('IndexNow');

  notify(...paths: string[]) {
    if (!env.INDEXNOW_KEY || env.NODE_ENV !== 'production') return;
    const site = env.SITE_URL.replace(/\/+$/, '');
    void submitToIndexNow({ siteUrl: site, key: env.INDEXNOW_KEY, urls: paths.map((p) => `${site}${p}`) }).then((ok) => {
      if (!ok) this.log.warn('IndexNow submission was not accepted (check INDEXNOW_KEY and that /<key>.txt is reachable).');
    });
  }
}
