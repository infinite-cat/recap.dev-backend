import { Request, Response } from 'express'
import { config } from '../config'

export const getAnalytics = (req: Request, res: Response) => {
  res.set('Content-Type', 'application/javascript')

  if (config.usageAnalyticsDisabled) {
    res.end('')
    return
  }

  res.end(`
  function include(filename) {
    var head = document.getElementsByTagName('head')[0];

    var script = document.createElement('script');
    script.src = filename;
    script.type = 'text/javascript';

    head.appendChild(script)
}

    include('https://www.googletagmanager.com/gtag/js?id=G-NQZBNJ8SJF')
  
    const cyrb53 = function(str, seed = 0) {
     let h1 = 0xdeadbeef ^ seed,
        h2 = 0x41c6ce57 ^ seed;
     for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
     }
     h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
     h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
     return 4294967296 * (2097151 & h2) + (h1 >>> 0);
    };
  
    let clientIP = "${req.ip}";
    let validityInterval = Math.round (new Date() / 1000 / 3600 / 24 / 4);
    let clientIDSource = clientIP + ";" + window.location.host + ";" + navigator.userAgent + ";" + navigator.language + ";" + validityInterval;
    let clientIDHashed = cyrb53(clientIDSource).toString(16);
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    
    gtag('config', 'G-NQZBNJ8SJF', {
      cookie_domain: 'none',
      page_location: 'https://recap.dev' + window.location.pathname,
      page_referrer: 'https://recap.dev',
      referrer: 'https://recap.dev',
      client_storage: 'none',
      client_id: clientIDHashed,
      anonymize_ip: true,
      cookie_expires: 0,
      ignore_referrer: true,
      storage: 'none',
      cookie_update: false,
    });

    gtag('js', new Date());
  `)
}
