// Teasers use a fixed identity; the full article keeps the editor's visual theme.
export function featuredTeaserStyle(analysis = false) {
 return {
  '--visual-background': '#080c1b', '--visual-surface': '#121127', '--visual-text': '#f8f5ff',
  '--visual-primary': analysis ? '#b98824' : '#8b35e9',
  '--visual-secondary': analysis ? '#e5c365' : '#ec4899',
  '--visual-accent': analysis ? '#ffdf80' : '#7deaf4',
  '--visual-border': analysis ? '#edcb6b' : '#bf91ff',
  '--visual-highlight': analysis ? '#ffdf80' : '#bcefff',
  '--visual-label-background': analysis ? '#c9a341' : '#7024dc',
  '--visual-label-text': analysis ? '#211804' : '#fff',
  '--visual-button-background': analysis ? '#e6c163' : '#7024dc',
  '--visual-button-text': analysis ? '#211804' : '#fff'
 }
}
