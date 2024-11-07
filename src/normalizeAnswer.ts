import { isCancel, cancel } from '@clack/prompts'

// normalize the prompt answer and deal with cancel operations
export async function normalizeAnswer<T>(maybeCancelPromise: Promise<T | symbol>): Promise<T> {
  const maybeCancel = await maybeCancelPromise

  if (isCancel(maybeCancel)) {
    cancel('Operation cancelled.')
    process.exit(0)
  } else {
    return maybeCancel
  }
}
