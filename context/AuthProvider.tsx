import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabase";

type AuthContextType = {
    user: any;
};

const AuthContext = createContext<AuthContextType>({ user: null });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
