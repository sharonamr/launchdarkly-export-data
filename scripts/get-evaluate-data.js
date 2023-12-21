import fetch from 'node-fetch';
import fs from 'fs';

const API_KEY = process.env.LD_API_TOKEN;
const EVALUATE_URL = 'https://app.launchdarkly.com/api/v2/projects/default/environments/production/flags/evaluate';
const RATE_LIMIT_DELAY = 2000;
const wait = () => new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
export const evaluate = async (contexts, count) => {
  const resArr = [];
  for(let i = 0; i < contexts.length; i ++) {
    const context = contexts[i];
    console.log('Requesting flags/evaluate for', context.context.key);
    const res = await fetch(
      EVALUATE_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: API_KEY,
        },
        body: JSON.stringify({
          key: context.context.key,
          kind: 'user',
        })
      })
    const json = await res.json();
    if (json.code === 'rate_limited') {
      throw new Error(json.message);
    }
    resArr.push({ user_key: context.context.key, data: json })
    await wait();
  };

  console.log('writing evaluated flags file', count);
  fs.writeFileSync(`data/evaluated/${count}.json`, JSON.stringify(resArr, null, 2), 'utf8');
}
