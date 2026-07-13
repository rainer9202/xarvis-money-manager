import { normalizeApiError } from '../lib/api/errors';

describe('normalizeApiError', () => {
  it('normalizes a class-validator validation error (string[] message)', () => {
    const error = normalizeApiError(400, {
      statusCode: 400,
      message: ['email must be an email', 'password must be longer than or equal to 8 characters'],
      error: 'Bad Request',
    });

    expect(error.kind).toBe('validation');
    expect(error.messages).toHaveLength(2);
    expect(error.status).toBe(400);
  });

  it('normalizes a domain error (string message + exception class)', () => {
    const error = normalizeApiError(404, {
      statusCode: 404,
      message: 'Account "abc" not found',
      error: 'NotFoundException',
    });

    expect(error.kind).toBe('domain');
    expect(error.messages).toEqual(['Account "abc" not found']);
    expect(error.errorClass).toBe('NotFoundException');
  });

  it('normalizes the generic 401 body with no error field', () => {
    const error = normalizeApiError(401, { statusCode: 401, message: 'Unauthorized' });

    expect(error.kind).toBe('domain');
    expect(error.status).toBe(401);
  });

  it('falls back to unknown for an unrecognized body shape', () => {
    const error = normalizeApiError(500, { oops: true });

    expect(error.kind).toBe('unknown');
  });
});
