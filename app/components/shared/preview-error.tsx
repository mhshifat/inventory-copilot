interface PreviewErrorProps {
    error: string;
}

export default function PreviewError({ error }: PreviewErrorProps) {
    return <div dangerouslySetInnerHTML={{
        __html: error
    }} />
}