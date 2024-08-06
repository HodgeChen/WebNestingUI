export function gethostname()
{
    
    let APIServer = "https://8.133.189.111/"
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "")
    {
        APIServer = "http://localhost:31351/"
    }
    return APIServer
}