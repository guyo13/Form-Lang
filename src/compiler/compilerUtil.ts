export function traverseDFS<T>(
  rootNode: T,
  getChildren: (node: T) => T[],
  onEntry: (node: T, time: number) => void,
  onExit: (node: T, time: number) => void,
): void {
  const visited = new Set<T>();
  let time = 0;

  const stack: T[] = [rootNode];

  while (stack.length > 0) {
    const node = stack[stack.length - 1];

    if (!visited.has(node)) {
      visited.add(node);
      time++;
      onEntry(node, time);

      // Get children of the node
      const children = getChildren(node);

      // Push unvisited children onto the stack in reverse order
      for (let child of children) {
        if (!visited.has(child)) {
          stack.push(child);
        }
      }
    } else {
      stack.pop();
      time++;
      onExit(node, time);
    }
  }
}

export function zip(...arrays: any[]) {
  // Find the smallest array length to avoid undefined values
  const minLength = Math.min(...arrays.map((arr) => arr.length));
  return Array.from({ length: minLength }, (_, i) =>
    arrays.map((arr) => arr[i]),
  );
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function uncapitalize(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
