import { Link } from 'react-router-dom'
import { posts } from '../data/posts.js'

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

// Blog index. Dark editorial style to match the landing/marketing side.
export default function Blog() {
  return (
    <div className="bg-black text-white">
      <div className="mx-auto max-w-3xl px-5 py-20">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-neutral-600">Blog</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">News &amp; updates</h1>
        <p className="mt-3 max-w-xl text-sm text-neutral-400">
          Launches, build notes, and updates from the ledgr project.
        </p>

        <div className="mt-12 divide-y divide-neutral-800/70">
          {posts.map((post) => (
            <article key={post.slug} className="py-8 first:pt-0">
              <p className="text-xs text-neutral-500">{formatDate(post.date)}</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                <Link to={`/blog/${post.slug}`} className="transition hover:text-emerald-400">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{post.excerpt}</p>
              <Link
                to={`/blog/${post.slug}`}
                className="mt-3 inline-block text-sm font-medium text-emerald-400 underline underline-offset-4 decoration-emerald-400/30 transition hover:decoration-emerald-400"
              >
                Read more →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
