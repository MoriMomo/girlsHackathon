import { Link, useParams } from 'react-router-dom'
import { getPost } from '../data/posts.js'

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

// Render a structured post body (no markdown parser needed).
function Block({ block }) {
  if (block.type === 'h2') {
    return <h2 className="mt-8 text-lg font-semibold tracking-tight text-white">{block.text}</h2>
  }
  if (block.type === 'ul') {
    return (
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-400">
        {block.items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    )
  }
  return <p className="mt-4 text-sm leading-relaxed text-neutral-300">{block.text}</p>
}

export default function BlogPost() {
  const { slug } = useParams()
  const post = getPost(slug)

  if (!post) {
    return (
      <div className="bg-black text-white">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h1 className="text-xl font-semibold">Post not found</h1>
          <p className="mt-2 text-sm text-neutral-400">This article doesn&apos;t exist or was moved.</p>
          <Link
            to="/blog"
            className="mt-6 inline-block rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5"
          >
            ← Back to the blog
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black text-white">
      <article className="mx-auto max-w-3xl px-5 py-20">
        <Link
          to="/blog"
          className="text-sm text-neutral-500 transition hover:text-neutral-300"
        >
          ← Blog
        </Link>
        <p className="mt-6 text-xs text-neutral-500">{formatDate(post.date)}</p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-6">
          {post.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </article>
    </div>
  )
}
