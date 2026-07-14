import { describe, it, expect, mock, beforeEach } from 'bun:test';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetUser    = mock<() => Promise<{ data: { user: any }; error: any }>>(() =>
  Promise.resolve({ data: { user: null }, error: null }),
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetSession = mock<() => Promise<{ data: { session: any } }>>(() =>
  Promise.resolve({ data: { session: null } }),
);

mock.module('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser, getSession: mockGetSession },
  }),
}));

mock.module('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL:      'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
}));

const { handle } = await import('./hooks.server');

const MOCK_USER    = { id: 'user-1', email: 'test@example.com' };
const MOCK_SESSION = { access_token: 'tok', user: MOCK_USER };

function makeEvent() {
  return {
    cookies: {
      getAll: () => [] as { name: string; value: string }[],
      set:    () => {},
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    locals: {} as any,
  };
}

const resolve = mock(() => Promise.resolve(new Response('ok')));

describe('hooks.server — safeGetSession', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockGetSession.mockReset();
    resolve.mockReset();
    resolve.mockImplementation(() => Promise.resolve(new Response('ok')));
  });

  it('retorna null,null cuando getUser() devuelve error', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Unauthorized' } });
    const event = makeEvent();
    await handle({ event, resolve } as never);

    const result = await event.locals.safeGetSession();
    expect(result).toEqual({ session: null, user: null });
  });

  it('no llama a getSession() si getUser() falla', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'fail' } });
    const event = makeEvent();
    await handle({ event, resolve } as never);
    await event.locals.safeGetSession();

    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('retorna null,null cuando getUser() devuelve user null sin error', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const event = makeEvent();
    await handle({ event, resolve } as never);

    expect(await event.locals.safeGetSession()).toEqual({ session: null, user: null });
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('llama a getSession() solo después de confirmar usuario válido', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockGetSession.mockResolvedValueOnce({ data: { session: MOCK_SESSION } });
    const event = makeEvent();
    await handle({ event, resolve } as never);
    await event.locals.safeGetSession();

    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it('retorna session y user cuando ambos están disponibles', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockGetSession.mockResolvedValueOnce({ data: { session: MOCK_SESSION } });
    const event = makeEvent();
    await handle({ event, resolve } as never);

    const result = await event.locals.safeGetSession();
    expect(result).toEqual({ session: MOCK_SESSION, user: MOCK_USER });
  });

  it('llamadas independientes cada una contacta getUser()', async () => {
    mockGetUser
      .mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null })
      .mockResolvedValueOnce({ data: { user: null },      error: null });
    mockGetSession.mockResolvedValue({ data: { session: MOCK_SESSION } });

    const event = makeEvent();
    await handle({ event, resolve } as never);

    const r1 = await event.locals.safeGetSession();
    const r2 = await event.locals.safeGetSession();

    expect(r1.user).toEqual(MOCK_USER);
    expect(r2.user).toBeNull();
    expect(mockGetUser).toHaveBeenCalledTimes(2);
  });
});
