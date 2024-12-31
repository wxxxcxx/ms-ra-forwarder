'use client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCurrentLocale, useTranslation } from "@/locales/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { withClientLayout } from "./layout";
import { Button } from "@/components/ui/button";
import { login } from "@/app/actions/login";
import router from "next/router";
import { useActionState } from "react";
import { useRouter } from "next/navigation";

function Page() {

    const t = useTranslation()
    const formSchema = z.object({
        token: z.string().min(1, { message: t('login.token.required') }),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            token: "",
        },
    });
    const router = useRouter()
    const handleSubmit = form.handleSubmit(async (data) => {
        try {
            const success = await login(data.token)
            if (success) {
                router.push('/')
            } else {
                form.setError('root', { type: 'manual', message: t('error.invalid_token') })
            }
        } catch (error) {
            console.error(error)
            form.setError('root', { type: 'manual', message: t('error.unknown') })
        }
    })
    return (
        <form onSubmit={handleSubmit}>
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>{t('title')}</CardTitle>
                    <CardDescription>{t('description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <FormField name="token" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('login.token')}</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder={t('login.token.placeholder')} />
                                </FormControl>
                                <FormDescription>
                                    {t('login.token.description')}
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
                    <Button type="submit">{t('login.button.confirm')}</Button>
                </CardFooter>
            </Card>
        </form>

    )
}

export default withClientLayout(Page)
