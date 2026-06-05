#[test_only]
module veris::registry_tests {
    use veris::registry;
    use sui::clock;
    use sui::test_scenario;

    #[test]
    fun test_register_original() {
        let creator = @0xCAFE;
        let mut scenario = test_scenario::begin(creator);

        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        test_scenario::next_tx(&mut scenario, creator);
        {
            registry::register(
                b"walrus-blob-id-original",
                b"walrus-blob-id-credential",
                b"0xabcdef1234567890",
                b"a1b2c3d4e5f60718",
                b"image/jpeg",
                false,
                &clk,
                test_scenario::ctx(&mut scenario),
            );
        };

        clock::destroy_for_testing(clk);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_register_encrypted() {
        let creator = @0xBEEF;
        let mut scenario = test_scenario::begin(creator);

        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        test_scenario::next_tx(&mut scenario, creator);
        {
            registry::register(
                b"walrus-encrypted-blob",
                b"walrus-cred-blob",
                b"0xdeadbeef00000000",
                b"0000000000000000",
                b"application/pdf",
                true,
                &clk,
                test_scenario::ctx(&mut scenario),
            );
        };

        clock::destroy_for_testing(clk);
        test_scenario::end(scenario);
    }
}
