function* map<T, U>(a: T[], fn: (x: T) => U) {
  for (let x of a) yield fn(x)
}

function find<T>(a: Generator<T, void, unknown>, fn: (x: T) => boolean) {
  for (let x of a) if (fn(x)) return x
  return undefined
}

export function mapFind<T, U>(
  collection: T[],
  mapper: (item: T) => U,
  finder: (item: U) => boolean
): U | undefined {
  const mapperGenerator = map(collection, mapper)

  return find(mapperGenerator, finder)
}
