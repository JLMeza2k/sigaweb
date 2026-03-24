
function App() {

  return (
  <div className="bg-sky-100 flex justify-center items-center h-screen">
    {/* Left Side  */}
    <div className="w-1/2 h-screen hidden lg:block">
      <img src="https://img.freepik.com/fotos-premium/imagen-fondo_910766-187.jpg?w=826" alt="Placeholder Image" className="object-cover w-full h-full" />
    </div>
    {/* Right side */}
    <div className= "lg:p-36 md:p-52 sm:20 p-8 w-full lg:w-1/2">
    <h1 className="text-2xl font-semibold mb-4">Login</h1>
    <form action="#" method="POST">
      {/* Username Input */}
      <div className="mb-4 bg-sky-100">
        <label htmlFor="username" className="block text-gray-600">Username</label>
        <input type="text" id="username" name="username" className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:border-blue-500"  />
      </div>
      {/* Password Input */}
      <div className="mb-4">
        <label htmlFor="password" className="block text-gray-800">Password</label>
        <input type="password" id="password" name="password" className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:border-blue-500" />
      </div>
      {/*  Remember Me Checkbox */}
      <div className="mb-4 flex items-center">
        <input type="checkbox" id="remember" name="remember" className="text-red-500" />
        <label htmlFor="remember" className="text-green-900 ml-2">Remember Me</label>
      </div>
      {/*  Forgot Password Link */ }
      <div className="mb-6 text-blue-500">
        <a href="#" className="hover:underline">Forgot Password?</a>
      </div>
      {/* Login Button */}
      <button type="submit" className="bg-red-500 hover:bg-blue-600 text-white font-semibold rounded-md py-2 px-4 w-full">Login</button>
    </form>
    {/*  Sign up  Link */}
    <div className="mt-6 text-green-500 text-center">
      <a href="#" className="hover:underline">Sign up Here</a>
    </div>
  </div>
  </div>
  )
}

export default App
