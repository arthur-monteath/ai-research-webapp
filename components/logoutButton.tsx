'use client'

import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation'


export default function LogoutButton()
{
    const router = useRouter()

    const handleLogout = () => {
        // In a real app, you'd clear the session/token here
        router.push('/')
    }

    return(
        <Button onClick={handleLogout}>Logout</Button>
    );
}