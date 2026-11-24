// Adds maxFontSizeMultiplier={1.3} to every <Text> / <TextInput> in the app's own source (unless one
// is set already). Phones with a very large system font otherwise blow card titles and amounts past
// their boxes; 1.3× still honours the setting, just without breaking layouts. (React 19 dropped
// defaultProps for function components, so a global Text.defaultProps no longer works.)
module.exports = function capFontScale({ types: t }) {
  return {
    visitor: {
      JSXOpeningElement(path, state) {
        const file = state.filename || ''
        if (!/[\\/]mobile[\\/]src[\\/]/.test(file)) return
        const name = path.node.name
        if (!t.isJSXIdentifier(name) || (name.name !== 'Text' && name.name !== 'TextInput')) return
        const has = path.node.attributes.some((a) => t.isJSXAttribute(a) && a.name.name === 'maxFontSizeMultiplier')
        if (has) return
        path.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('maxFontSizeMultiplier'), t.jsxExpressionContainer(t.numericLiteral(1.3))))
      },
    },
  }
}
