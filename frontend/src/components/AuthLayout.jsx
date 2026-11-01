import Logo from './Logo'
import { ArrowLeft } from 'lucide-react'

function AuthLayout({ title, description, children, onHome }) {
  return (
    <div className="min-h-screen bg-[#FAF7F0] p-3 sm:p-5">

      {/* Stacked on phones; side by side on large screens */}
      <div className="grid min-h-[calc(100vh-40px)] grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-0">

        {/* LEFT SIDE */}
        <div className="flex flex-col p-3 lg:p-10">
          <button
            type="button"
            onClick={onHome}
            aria-label="SilverRoute home"
            className="w-fit cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3E424B]"
          >
            <Logo />
          </button>
          <div className="hidden flex-1 items-center justify-center lg:flex">
            <img
              src="/image.png"
              alt="finding their way"
              className="w-full"
            />
          </div>

        </div>


        {/* RIGHT SIDE */}
        <div className="flex items-start justify-center rounded-[32px] bg-white p-6 sm:p-12 lg:items-center">

          <div className="w-full max-w-[520px]">
            <button
              type="button"
              onClick={onHome}
              className="mb-6 inline-flex cursor-pointer items-center gap-2 rounded-lg text-[#3E424B] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3E424B]"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Back to home
            </button>
            <h1
              className="text-4xl sm:text-5xl"
              style={{ fontFamily: '"DM Serif Display", serif' }}
            >
              {title}
            </h1>

            <p className="mt-4 text-lg text-[#555C60]">
              {description}
            </p>

            {children}
          </div>

        </div>

      </div>

    </div>
  )
}

export default AuthLayout
