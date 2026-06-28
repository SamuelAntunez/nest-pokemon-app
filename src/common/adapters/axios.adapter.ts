import { Injectable } from "@nestjs/common";
import { AxiosInstance } from "axios";
import axios from "axios";
import { HttpAdapter } from "../interfaces/http-adapter.interface";

@Injectable()
export class AxiosAdapter implements HttpAdapter {

    private readonly axios: AxiosInstance = axios

    async get<T>(url: string): Promise<T> {

        try {
            const { data } = await this.axios.get<T>(url)
            return data
        } catch (error) {
            throw new Error('Axios get adapter error')    
        }
        
    }




}