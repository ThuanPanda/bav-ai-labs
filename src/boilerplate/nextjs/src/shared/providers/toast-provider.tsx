import { ToastContainer } from "react-toastify";

export function ToastProviders() {

    return (
        <ToastContainer
            position='top-right'
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
            theme="colored"
            toastClassName='md:min-w-[368px] !p-0 !bg-transparent'
        />
    );
}
