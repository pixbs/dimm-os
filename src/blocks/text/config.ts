import {
  BlockquoteFeature,
  BoldFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineCodeFeature,
  InlineToolbarFeature,
  LinkFeature,
  lexicalEditor,
  OrderedListFeature,
  ParagraphFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical'
import type { Block } from 'payload'

import { frame } from '../frame'

// Running text, holding only what the rich text organism draws.
export const Text: Block = {
  slug: 'text',
  interfaceName: 'TextBlock',
  admin: {
    images: {
      thumbnail: { url: '/block-previews/text.png', alt: 'Preview of the Text section' },
    },
  },
  fields: [
    ...frame({ split: true, join: true }),
    {
      name: 'body',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: [
          ParagraphFeature(),
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
          UnorderedListFeature(),
          OrderedListFeature(),
          BlockquoteFeature(),
          HorizontalRuleFeature(),
          BoldFeature(),
          InlineCodeFeature(),
          LinkFeature({ enabledCollections: ['windows'] }),
          InlineToolbarFeature(),
        ],
      }),
    },
  ],
}
