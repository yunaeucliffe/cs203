import Logo from './Logo'

function AuthLayout({ title, description, children }) {
  return (
    <div className="min-h-screen bg-[#FAF7F0] p-5">

      <div className="grid min-h-[calc(100vh-40px)] grid-cols-2">

        {/* LEFT SIDE */}
        <div className="flex flex-col p-10">
          <Logo />
          <div className="flex flex-1 items-center justify-center">
            <img
              src="/image.png"
              alt="finding their way"
              className="w-full"
            />
          </div>

        </div>


        {/* RIGHT SIDE */}
        <div className="flex items-center rounded-[32px] bg-white p-16">

          <div>
            <h1
              className="text-5xl"
              style={{ fontFamily: '"DM Serif Display", serif' }}
            >
              {title}
            </h1>

            <p className="mt-4 text-lg text-[#7A7F7A]">
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