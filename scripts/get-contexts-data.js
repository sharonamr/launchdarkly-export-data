import fetch from 'node-fetch';
import fs from 'fs';
import { evaluate } from './get-evaluate-data.js';

const LIMIT = 50;
const API_KEY = process.env.LD_API_TOKEN;
const SEARCH_URL = 'https://app.launchdarkly.com/api/v2/projects/default/environments/production/contexts/search';

let initialCount = 0;

const fetchNext = async continuationToken => {
  const files = fs.readdirSync('data/contexts');
  const count = files.length + 1;
  console.log('fetching contexts', count);
  const res = await fetch(
    SEARCH_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: API_KEY,
      },
      body: JSON.stringify({
        sort: '-ts',
        limit: LIMIT,
        continuationToken,
      })
    }
  );

  const data = await res.json();
  if (data.items.length === 0) {
    return;
  }
  if (initialCount > 1) {
    console.log ('comparing to initial count:', initialCount);
    const prevContextFile = fs.readFileSync(`data/contexts/${initialCount}.json`, { encoding: 'utf-8' });
    const prevContext = JSON.parse(prevContextFile);
    const prevMap = prevContext.map(item => item.context.key);
    const currentMap = data.items.map(item => item.context.key);
    const index = prevMap.findIndex(key => currentMap.includes(key));
    console.log(currentMap);
    console.log(prevMap);
    if (index === -1 && data.items.length > 0) {
      await evaluate(data.items, count);
      fs.writeFileSync(`data/contexts/${count}.json`, JSON.stringify(data.items, null, 2), 'utf8');
    } else {
      const partialItems = data.items.slice(0, index);
      if (partialItems.length > 0) {
        await evaluate(partialItems, count);
        fs.writeFileSync(`data/contexts/${count}.json`, JSON.stringify(partialItems, null, 2), 'utf8');
        console.log('writing partial context file', count);
      }
      console.log('No new contexts');
      console.log('------------------------');
      process.exit(0);
    }
  } else {
    await evaluate(data.items, count);
    fs.writeFileSync(`data/contexts/${count}.json`, JSON.stringify(data.items, null, 2), 'utf8');
  }
  console.log('writing context file', count);
  console.log('------------------------');
  if (data.continuationToken) {
    await fetchNext(data.continuationToken);
  }
}

async function run() {
  fs.mkdirSync('data/contexts', { recursive: true })
  fs.mkdirSync('data/evaluated', { recursive: true })
  const files = fs.readdirSync('data/contexts');
  initialCount = files.length;
  await fetchNext();
}

run();