import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { logAudit } from './audit';

const mockInsert = mock(() => Promise.resolve({ error: null }));
const mockFrom   = mock(() => ({ insert: mockInsert }));
const supabase   = { from: mockFrom } as never;

beforeEach(() => {
	mockInsert.mockClear();
	mockFrom.mockClear();
});

describe('logAudit', () => {
	it('inserta en audit_log con los campos correctos', async () => {
		await logAudit({
			supabase,
			projectId: 'proj-1',
			userId: 'user-1',
			actor: 'test@example.com',
			action: 'create',
			resourceType: 'page',
			resourceId: 'page-1',
			resourceName: 'Inicio (/)',
			changed: ['title'],
		});

		expect(mockFrom).toHaveBeenCalledWith('audit_log');
		expect(mockInsert).toHaveBeenCalledWith({
			project_id:    'proj-1',
			user_id:       'user-1',
			actor:         'test@example.com',
			action:        'create',
			resource_type: 'page',
			resource_id:   'page-1',
			resource_name: 'Inicio (/)',
			changed:       ['title'],
			status:        'ok',
			error_message: null,
		});
	});

	it('usa status error y error_message cuando se indican', async () => {
		await logAudit({
			supabase,
			projectId: 'proj-1',
			userId: null,
			actor: 'system',
			action: 'purge_cache',
			resourceType: 'cache',
			status: 'error',
			errorMessage: 'CF error 1049',
		});

		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'error', error_message: 'CF error 1049' }),
		);
	});

	it('no lanza cuando Supabase devuelve error', async () => {
		mockInsert.mockImplementationOnce(() => Promise.reject(new Error('DB down')) as never);

		await expect(
			logAudit({
				supabase,
				projectId: 'proj-1',
				userId: null,
				actor: 'system',
				action: 'purge_cache',
				resourceType: 'cache',
			}),
		).resolves.toBeUndefined();
	});

	it('rellena nulos en campos opcionales ausentes', async () => {
		await logAudit({
			supabase,
			projectId: 'proj-1',
			userId: null,
			actor: 'system',
			action: 'purge_cache',
			resourceType: 'cache',
		});

		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({
				resource_id:   null,
				resource_name: null,
				changed:       null,
				error_message: null,
			}),
		);
	});
});
