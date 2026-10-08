export enum HttpMethod {
    Get = 'GET',
    Post = 'POST',
    Put = 'PUT',
}

export enum HttpStatus {
    NoContent = 204,
    BadRequest = 400,
    Unauthorized = 401,
    NotFound = 404,
    CsrfTokenMismatch = 419,
    UnprocessableEntity = 422,
    ClientClosedRequest = 499,
    InternalServerError = 500,
}
