export function addNode(tree, parentId, newNode) {
  return tree.map(node => {
    if (node.id === parentId && node.type === "folder") {
      return {
        ...node,
        children: [...(node.children || []), newNode],
        collapsed: false,
      };
    }

    if (node.children) {
      return {
        ...node,
        children: addNode(node.children, parentId, newNode),
      };
    }

    return node;
  });
}

export function deleteNode(tree, id) {
  return tree
    .filter(n => n.id !== id)
    .map(n =>
      n.children
        ? { ...n, children: deleteNode(n.children, id) }
        : n
    );
}

export function renameNode(tree, id, name) {
  return tree.map(n => {
    if (n.id === id) return { ...n, name };

    if (n.children) {
      return { ...n, children: renameNode(n.children, id, name) };
    }

    return n;
  });
}