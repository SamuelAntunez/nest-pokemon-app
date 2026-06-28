import { IsNumber, IsOptional, IsPositive, Min } from "class-validator";


export class PaginationDto {
    
    @IsOptional()
    @IsPositive()
    @IsNumber()
    limit?: number;


    @IsOptional()
    @Min(0)
    @IsNumber()
    offset?: number
}