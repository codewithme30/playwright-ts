import { test, expect } from '@playwright/test';

/**
 * Sample API-layer tests against JSONPlaceholder (https://jsonplaceholder.typicode.com),
 * a publicly hosted fake REST API commonly used for testing and prototyping.
 * baseURL is configured per-project in playwright.samples.config.ts.
 */
test.describe('JSONPlaceholder API', () => {
  test('GET /posts/1 returns a single post with the expected shape', async ({ request }) => {
    const res = await request.get('/posts/1');
    expect(res.status()).toBe(200);

    const post = await res.json();
    expect(post.id).toBe(1);
    expect(typeof post.userId).toBe('number');
    expect(typeof post.title).toBe('string');
    expect(typeof post.body).toBe('string');
  });

  test('GET /posts returns all 100 seeded posts', async ({ request }) => {
    const res = await request.get('/posts');
    expect(res.status()).toBe(200);

    const posts = await res.json();
    expect(Array.isArray(posts)).toBe(true);
    expect(posts).toHaveLength(100);
  });

  test('GET /posts/1/comments returns comments that belong to post 1', async ({ request }) => {
    const res = await request.get('/posts/1/comments');
    expect(res.status()).toBe(200);

    const comments = await res.json();
    expect(comments.length).toBeGreaterThan(0);
    for (const comment of comments) {
      expect(comment.postId).toBe(1);
      expect(comment.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    }
  });

  test('POST /posts creates a new resource and echoes the payload', async ({ request }) => {
    const payload = { title: 'Sample test post', body: 'Created by the sample API suite', userId: 1 };
    const res = await request.post('/posts', { data: payload });
    expect(res.status()).toBe(201);

    const created = await res.json();
    expect(created).toMatchObject(payload);
    expect(created.id).toBeGreaterThan(0);
  });

  test('PUT /posts/1 updates an existing resource', async ({ request }) => {
    const payload = { id: 1, title: 'Updated title', body: 'Updated body', userId: 1 };
    const res = await request.put('/posts/1', { data: payload });
    expect(res.status()).toBe(200);

    const updated = await res.json();
    expect(updated).toMatchObject(payload);
  });

  test('DELETE /posts/1 removes the resource', async ({ request }) => {
    const res = await request.delete('/posts/1');
    expect(res.status()).toBe(200);
  });

  test('GET /users/1 returns a user with a valid email and nested address', async ({ request }) => {
    const res = await request.get('/users/1');
    expect(res.status()).toBe(200);

    const user = await res.json();
    expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(user.address).toHaveProperty('city');
    expect(user.address.geo).toHaveProperty('lat');
  });

  test('GET /posts/9999 returns 404 for a non-existent post', async ({ request }) => {
    const res = await request.get('/posts/9999');
    expect(res.status()).toBe(404);
  });
});
