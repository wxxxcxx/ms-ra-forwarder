type Fn = () => Promise<any>
type ErrorFn = (index, error) => void
export const retry = async function (
  fn: Fn,
  times: number,
  errorFn?: ErrorFn,
  failedMessage?: string,
) {
  let reason = {
    message: failedMessage ?? '多次尝试后失败',
    errors: [],
  }
  for (let i = 0; i < times; i++) {
    try {
      return await fn()
    } catch (error) {
      if (errorFn) {
        errorFn(i, error)
      }
      reason.errors.push(error)
    }
  }
  throw reason
}
