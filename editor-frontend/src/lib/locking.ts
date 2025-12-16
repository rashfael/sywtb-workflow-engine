export function createReentrancyGuard () {
	let locked = false
	return <T extends (...args: any[]) => void>(fn: T): T => {
		return ((...args: Parameters<T>) => {
			if (locked) return
			locked = true
			try {
				fn(...args)
			} finally {
				locked = false
			}
		}) as T
	}
}
