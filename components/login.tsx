'use client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/shadcn/ui/form";
import { Input } from "@/components/shadcn/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/shadcn/ui/button";
import { login } from "@/app/actions/login";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
    const formSchema = z.object({
        token: z.string().min(1, { message: '令牌是必需的' }),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            token: "",
        },
    });
    const router = useRouter()
    
    // 检查是否已经登录
    useEffect(() => {
        const savedToken = localStorage.getItem('auth_token')
        if (savedToken) {
            router.push('/')
        }
    }, [router])
    
    const handleSubmit = form.handleSubmit(async (data) => {
        try {
            const result = await login(data.token)
            if (result && result.success) {
                // 保存token到localStorage
                localStorage.setItem('auth_token', result.token)
                router.push('/')
            } else {
                form.setError('root', { type: 'manual', message: '令牌无效' })
            }
        } catch (error) {
            console.error(error)
            form.setError('root', { type: 'manual', message: '登录失败，请检查令牌是否正确' })
        }
    })
    return (
        <form onSubmit={handleSubmit}>
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>MS Read Aloud Forwarder</CardTitle>
                    <CardDescription>MS Read Aloud Forwarder是一个免费的文本转语音服务，允许您将文本转换为多种语言的语音。</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <FormField name="token" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>令牌</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="请输入您的令牌" />
                                </FormControl>
                                <FormDescription>
                                    输入您的令牌登录
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        {form.formState.errors.root && (
                            <FormMessage>{form.formState.errors.root.message}</FormMessage>
                        )}
                    </Form>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button type="submit">登录</Button>
                </CardFooter>
            </Card>
        </form>

    )
}
