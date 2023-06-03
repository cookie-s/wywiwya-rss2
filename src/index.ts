/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
}

import { Hono } from 'hono';
import { poweredBy } from 'hono/powered-by'
import { Feed } from 'feed';

// https://github.com/smallkirby/wywiwya/blob/v0.2.3/typings/diary.d.ts
type DiaryResult = {
	dateID: string,
	createdAt: number,
	lastUpdatedAt: number,
	isPublic: boolean,
	isTemporary: boolean,
	contentMd: string,
	author: string,
	id: string,
};

const app = new Hono()

const DiariesURL: string = 'https://asia-northeast1-wywiwya.cloudfunctions.net/fetchPublicDiaries';

app.use('*', poweredBy())

app.get('/users/:user_id', async (c) => {
	const user_id = c.req.param('user_id');
	const resp = await fetch(DiariesURL, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify({data: {uid: user_id}}),
		cf: {
			// https://developers.cloudflare.com/workers/examples/cache-using-fetch/
			cacheTtl: 60,
			cacheEverything: true,
		},
	});
	const Unix2Date = (unix: number) => new Date(unix);

	const json: {result: DiaryResult[]} = await resp.json();

	const channel = new Feed({
		id: `https://wywiwya.smallkirby.xyz/users/${user_id}`,
		title: `${user_id} -- WYWIWYA`,
		link: `https://wywiwya.smallkirby.xyz/users/${user_id}`,
		updated: Unix2Date(json.result.slice(-1)[0].lastUpdatedAt),
		copyright: 'copyright',
	});
	for(const item of json.result) {
		const {
			id,
			author,
			contentMd,
			createdAt,
			lastUpdatedAt,
		} = item;
		channel.addItem({
			id,
			title: id, // MUST exist for some library internal reason
			link: `https://wywiwya.smallkirby.xyz/view/${id}`,
			description: contentMd,
			author: [{
				name: author,
				link: `https://wywiwya.smallkirby.xyz/users/${author}`,
			}],
			published: Unix2Date(createdAt),
			date: Unix2Date(lastUpdatedAt),
		});
	}
	return c.text(channel.atom1());
})

export default app
